// src/utils/validacao.ts
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validarCPF(cpf: string): boolean {
  return /^\d{11}$/.test(cpf);
}

export function validarCNPJ(cnpj: string): boolean {
  return /^\d{14}$/.test(cnpj);
}

export function validarSenha(senha: string): boolean {
  return senha.length >= 6;
}
