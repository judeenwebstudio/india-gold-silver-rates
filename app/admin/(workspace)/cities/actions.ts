"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { cityAdjustmentSchema, slugifyCity } from "@/lib/city-adjustments";
import type { CityActionState, CityFormField } from "@/lib/city-management";
import { prisma } from "@/lib/prisma";

class CityMutationError extends Error {}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function errorState(
  message: string,
  fieldErrors?: Partial<Record<CityFormField, string>>,
): CityActionState {
  return { status: "error", message, fieldErrors };
}

async function requireAdminSession() {
  const session = await auth();
  return Boolean(session?.user?.email);
}

const baseCitySchema = z.object({
  name: z.string().trim().min(2, "City name must contain at least 2 characters.").max(80),
  stateId: z.string().trim().min(1, "Choose a state."),
});

async function validateCityInput(formData: FormData) {
  const raw = {
    name: readField(formData, "name"),
    stateId: readField(formData, "stateId"),
    gold24KAdjustment: readField(formData, "gold24KAdjustment"),
    gold22KAdjustment: readField(formData, "gold22KAdjustment"),
    gold18KAdjustment: readField(formData, "gold18KAdjustment"),
    gold14KAdjustment: readField(formData, "gold14KAdjustment"),
    silver999Adjustment: readField(formData, "silver999Adjustment"),
  };
  const result = baseCitySchema.and(cityAdjustmentSchema()).safeParse(raw);

  if (!result.success) {
    const flattened = z.flattenError(result.error).fieldErrors;
    const fieldErrors = Object.fromEntries(
      Object.entries(flattened).map(([field, messages]) => [field, messages?.[0]]),
    ) as Partial<Record<CityFormField, string>>;
    return { success: false as const, state: errorState("Please correct the highlighted fields and try again.", fieldErrors) };
  }

  const state = await prisma.state.findFirst({
    where: { id: result.data.stateId, isActive: true },
    select: { id: true },
  });
  if (!state) {
    return {
      success: false as const,
      state: errorState("Choose an active state.", { stateId: "That active state was not found." }),
    };
  }

  return {
    success: true as const,
    data: {
      ...result.data,
      slug: slugifyCity(result.data.name),
      isActive: formData.get("isActive") === "on",
    },
  };
}

function handleMutationError(error: unknown): CityActionState {
  if (error instanceof CityMutationError) return errorState(error.message);
  console.error("City management operation failed.", error);
  return errorState("The city could not be saved. Please try again.");
}

function revalidateCityData() {
  revalidatePath("/");
  revalidatePath("/admin/cities");
  revalidatePath("/admin/states");
  revalidatePath("/admin/dashboard");
  revalidatePath("/api/locations");
  revalidatePath("/api/rates/national");
  revalidatePath("/api/rates/city/[slug]", "page");
}

export async function createCityAction(
  _previousState: CityActionState,
  formData: FormData,
): Promise<CityActionState> {
  if (!(await requireAdminSession())) return errorState("Your administrator session has expired. Sign in and try again.");
  const validation = await validateCityInput(formData);
  if (!validation.success) return validation.state;

  try {
    const duplicate = await prisma.city.findFirst({
      where: {
        OR: [
          { slug: validation.data.slug },
          { stateId: validation.data.stateId, name: { equals: validation.data.name, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (duplicate) throw new CityMutationError("A city with this name already exists. Edit the existing record instead.");

    await prisma.city.create({ data: validation.data });
  } catch (error) {
    return handleMutationError(error);
  }

  revalidateCityData();
  redirect("/admin/cities?notice=created");
}

export async function updateCityAction(
  _previousState: CityActionState,
  formData: FormData,
): Promise<CityActionState> {
  if (!(await requireAdminSession())) return errorState("Your administrator session has expired. Sign in and try again.");
  const id = readField(formData, "id");
  if (!id) return errorState("The city record could not be identified.");
  const validation = await validateCityInput(formData);
  if (!validation.success) return validation.state;

  try {
    const existing = await prisma.city.findUnique({ where: { id }, select: { isActive: true, deletedAt: true } });
    if (!existing) throw new CityMutationError("That city no longer exists.");
    if (existing.deletedAt) throw new CityMutationError("Soft-deleted cities cannot be edited.");

    const duplicate = await prisma.city.findFirst({
      where: {
        id: { not: id },
        OR: [
          { slug: validation.data.slug },
          { stateId: validation.data.stateId, name: { equals: validation.data.name, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (duplicate) throw new CityMutationError("A city with this name already exists.");

    await prisma.city.update({ where: { id }, data: validation.data });
  } catch (error) {
    return handleMutationError(error);
  }

  revalidateCityData();
  redirect("/admin/cities?notice=updated");
}

export async function softDeleteCityAction(
  _previousState: CityActionState,
  formData: FormData,
): Promise<CityActionState> {
  if (!(await requireAdminSession())) return errorState("Your administrator session has expired. Sign in and try again.");
  const id = readField(formData, "id");
  if (!id) return errorState("The city record could not be identified.");

  try {
    const city = await prisma.city.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!city) throw new CityMutationError("That city no longer exists.");
    if (city.deletedAt) throw new CityMutationError("That city is already soft deleted.");
    await prisma.city.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  } catch (error) {
    return handleMutationError(error);
  }

  revalidateCityData();
  redirect("/admin/cities?notice=deleted");
}
