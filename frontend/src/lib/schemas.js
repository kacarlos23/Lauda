import { z } from "zod";
import {
  MUSIC_CLASSIFICATION_OPTIONS,
  USER_FUNCTION_OPTIONS,
} from "./constants";

const userFunctionValues = new Set(USER_FUNCTION_OPTIONS);
const musicClassificationValues = new Set(
  MUSIC_CLASSIFICATION_OPTIONS.map((item) => item.value),
);

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => value?.trim() || "");

export const funcoesSchema = z
  .array(z.string())
  .default([])
  .superRefine((values, ctx) => {
    values.forEach((value, index) => {
      if (!userFunctionValues.has(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Funcao invalida.",
          path: [index],
        });
      }
    });
  });

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Informe seu nome."),
  last_name: optionalTrimmedString,
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Informe um e-mail valido.",
    })
    .transform((value) => value || ""),
  telefone: optionalTrimmedString,
  username: optionalTrimmedString,
  funcoes: funcoesSchema,
});

export const inviteSchema = z.object({
  username: z.string().trim().min(1, "Informe um usuario."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
  first_name: z.string().trim().min(1, "Informe seu nome."),
  last_name: optionalTrimmedString,
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Informe um e-mail valido.",
    })
    .transform((value) => value || ""),
  telefone: optionalTrimmedString,
  funcoes: funcoesSchema,
});

export const ministrySettingsSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome do ministerio.")
    .max(150, "O nome do ministerio esta muito longo."),
});

export const musicFormSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o titulo da musica."),
  artista: z.string().trim().min(1, "Informe o artista."),
  tom_original: z.string().trim().min(1, "Informe o tom original."),
  classificacao: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || musicClassificationValues.has(value), {
      message: "Classificacao invalida.",
    })
    .transform((value) => value || ""),
});
