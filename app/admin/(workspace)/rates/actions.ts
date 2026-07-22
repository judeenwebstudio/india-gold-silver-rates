"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  MetalPurity,
  MetalType,
  RateHistoryAction,
  type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isManagedMetal,
  isManagedPurity,
  isPurityAllowedForMetal,
  METAL_MANAGEMENT,
  type ManagedMetalType,
  type ManagedPurity,
  type RateActionState,
  type RateFormField,
} from "@/lib/rate-management";

const ADMIN_SOURCE = "ADMIN_UI";
const PRICE_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type ValidRateInput = {
  metalType: ManagedMetalType;
  stateId: string;
  cityId: string;
  purity: ManagedPurity;
  pricePerGram: string;
  pricePerKilogram: string | null;
  recordedAt: Date;
};

type RateSnapshotSource = {
  id: string;
  metalType: MetalType;
  purity: MetalPurity;
  pricePerGram: { toString(): string };
  pricePerKilogram: { toString(): string } | null;
  cityId: string | null;
  source: string;
  recordedAt: Date;
  isActive: boolean;
  deletedAt: Date | null;
};

class RateMutationError extends Error {}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function errorState(
  message: string,
  fieldErrors?: Partial<Record<RateFormField, string>>,
): RateActionState {
  return { status: "error", message, fieldErrors };
}

function validatePrice(
  value: string,
  label: string,
  required: boolean,
): string | undefined {
  if (!value) {
    return required ? `${label} is required.` : undefined;
  }

  if (!PRICE_PATTERN.test(value) || Number(value) <= 0) {
    return `${label} must be a positive amount with up to two decimal places.`;
  }

  return undefined;
}

async function validateRateInput(formData: FormData): Promise<
  | { success: true; data: ValidRateInput }
  | { success: false; state: RateActionState }
> {
  const metalType = readField(formData, "metalType");
  const stateId = readField(formData, "stateId");
  const cityId = readField(formData, "cityId");
  const purity = readField(formData, "purity");
  const pricePerGram = readField(formData, "pricePerGram");
  const pricePerKilogram = readField(formData, "pricePerKilogram");
  const recordedAtValue = readField(formData, "recordedAt");
  const fieldErrors: Partial<Record<RateFormField, string>> = {};

  if (!isManagedMetal(metalType)) {
    fieldErrors.metalType = "Choose a supported metal type.";
  }

  if (!stateId) {
    fieldErrors.stateId = "Choose a state.";
  }

  if (!cityId) {
    fieldErrors.cityId = "Choose a city.";
  }

  if (!isManagedPurity(purity)) {
    fieldErrors.purity = "Choose a valid purity.";
  } else if (isManagedMetal(metalType) && !isPurityAllowedForMetal(metalType, purity)) {
    fieldErrors.purity = `That purity is not valid for ${METAL_MANAGEMENT[metalType].label.toLowerCase()}.`;
  }

  const gramError = validatePrice(pricePerGram, "Price per gram", true);
  if (gramError) {
    fieldErrors.pricePerGram = gramError;
  }

  const kilogramRequired = metalType === "SILVER";
  const kilogramError = validatePrice(
    pricePerKilogram,
    "Price per kilogram",
    kilogramRequired,
  );
  if (kilogramError) {
    fieldErrors.pricePerKilogram = kilogramError;
  }

  let recordedAt: Date | null = null;
  if (!DATE_TIME_PATTERN.test(recordedAtValue)) {
    fieldErrors.recordedAt = "Choose a valid date and time.";
  } else {
    recordedAt = new Date(`${recordedAtValue}:00+05:30`);
    if (Number.isNaN(recordedAt.getTime())) {
      fieldErrors.recordedAt = "Choose a valid date and time.";
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !isManagedMetal(metalType) || !isManagedPurity(purity) || !recordedAt) {
    return {
      success: false,
      state: errorState("Please correct the highlighted fields and try again.", fieldErrors),
    };
  }

  const city = await prisma.city.findFirst({
    where: {
      id: cityId,
      stateId,
      isActive: true,
      deletedAt: null,
      state: { isActive: true },
    },
    select: { id: true },
  });

  if (!city) {
    return {
      success: false,
      state: errorState("The selected city does not belong to the selected active state.", {
        cityId: "Choose a valid city for this state.",
      }),
    };
  }

  return {
    success: true,
    data: {
      metalType,
      stateId,
      cityId,
      purity,
      pricePerGram,
      pricePerKilogram: pricePerKilogram || null,
      recordedAt,
    },
  };
}

function toSnapshot(rate: RateSnapshotSource): Prisma.InputJsonObject {
  return {
    id: rate.id,
    metalType: rate.metalType,
    purity: rate.purity,
    pricePerGram: rate.pricePerGram.toString(),
    pricePerKilogram: rate.pricePerKilogram?.toString() ?? null,
    cityId: rate.cityId,
    source: rate.source,
    recordedAt: rate.recordedAt.toISOString(),
    isActive: rate.isActive,
    deletedAt: rate.deletedAt?.toISOString() ?? null,
  };
}

function toPrismaMetal(metalType: ManagedMetalType) {
  return metalType === "GOLD" ? MetalType.GOLD : MetalType.SILVER;
}

function mutationErrorState(error: unknown) {
  if (error instanceof RateMutationError) {
    return errorState(error.message);
  }

  console.error("Rate management operation failed.", error);
  return errorState("The rate could not be saved. Please try again.");
}

async function requireAdminSession() {
  const session = await auth();

  if (!session?.user?.email) {
    return errorState("Your administrator session has expired. Sign in and try again.");
  }

  return null;
}

export async function createRateAction(
  _previousState: RateActionState,
  formData: FormData,
): Promise<RateActionState> {
  const sessionError = await requireAdminSession();
  if (sessionError) {
    return sessionError;
  }

  const validation = await validateRateInput(formData);

  if (!validation.success) {
    return validation.state;
  }

  const input = validation.data;
  const metalType = toPrismaMetal(input.metalType);

  try {
    await prisma.$transaction(async (transaction) => {
      const rate = await transaction.metalRate.create({
        data: {
          metalType,
          purity: input.purity as MetalPurity,
          pricePerGram: input.pricePerGram,
          pricePerKilogram: input.pricePerKilogram,
          cityId: input.cityId,
          source: ADMIN_SOURCE,
          recordedAt: input.recordedAt,
        },
      });

      await transaction.rateHistory.create({
        data: {
          metalRateId: rate.id,
          metalType,
          action: RateHistoryAction.CREATE,
          newData: toSnapshot(rate),
          source: ADMIN_SOURCE,
        },
      });
    });
  } catch (error) {
    return mutationErrorState(error);
  }

  const route = METAL_MANAGEMENT[input.metalType].route;
  revalidatePath(route);
  revalidatePath("/admin/dashboard");
  redirect(`${route}?notice=created`);
}

export async function updateRateAction(
  _previousState: RateActionState,
  formData: FormData,
): Promise<RateActionState> {
  const sessionError = await requireAdminSession();
  if (sessionError) {
    return sessionError;
  }

  const id = readField(formData, "id");

  if (!id) {
    return errorState("The rate record could not be identified.");
  }

  const validation = await validateRateInput(formData);

  if (!validation.success) {
    return validation.state;
  }

  const input = validation.data;
  const metalType = toPrismaMetal(input.metalType);

  try {
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.metalRate.findUnique({ where: { id } });

      if (!existing || existing.metalType !== metalType) {
        throw new RateMutationError("That rate record no longer exists.");
      }

      if (!existing.isActive) {
        throw new RateMutationError("Deleted rate records cannot be edited.");
      }

      const updated = await transaction.metalRate.update({
        where: { id },
        data: {
          purity: input.purity as MetalPurity,
          pricePerGram: input.pricePerGram,
          pricePerKilogram: input.pricePerKilogram,
          cityId: input.cityId,
          source: ADMIN_SOURCE,
          recordedAt: input.recordedAt,
        },
      });

      await transaction.rateHistory.create({
        data: {
          metalRateId: updated.id,
          metalType,
          action: RateHistoryAction.UPDATE,
          previousData: toSnapshot(existing),
          newData: toSnapshot(updated),
          source: ADMIN_SOURCE,
        },
      });
    });
  } catch (error) {
    return mutationErrorState(error);
  }

  const route = METAL_MANAGEMENT[input.metalType].route;
  revalidatePath(route);
  revalidatePath("/admin/dashboard");
  redirect(`${route}?notice=updated`);
}

export async function softDeleteRateAction(
  _previousState: RateActionState,
  formData: FormData,
): Promise<RateActionState> {
  const sessionError = await requireAdminSession();
  if (sessionError) {
    return sessionError;
  }

  const id = readField(formData, "id");

  if (!id) {
    return errorState("The rate record could not be identified.");
  }

  let managedMetal: ManagedMetalType;

  try {
    managedMetal = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.metalRate.findUnique({ where: { id } });

      if (!existing) {
        throw new RateMutationError("That rate record no longer exists.");
      }

      if (!existing.isActive) {
        throw new RateMutationError("That rate record is already deleted.");
      }

      const deleted = await transaction.metalRate.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          source: ADMIN_SOURCE,
        },
      });

      await transaction.rateHistory.create({
        data: {
          metalRateId: deleted.id,
          metalType: deleted.metalType,
          action: RateHistoryAction.SOFT_DELETE,
          previousData: toSnapshot(existing),
          newData: toSnapshot(deleted),
          source: ADMIN_SOURCE,
        },
      });

      return deleted.metalType === MetalType.GOLD ? "GOLD" : "SILVER";
    });
  } catch (error) {
    return mutationErrorState(error);
  }

  const route = METAL_MANAGEMENT[managedMetal].route;
  revalidatePath(route);
  revalidatePath("/admin/dashboard");
  redirect(`${route}?notice=deleted`);
}
