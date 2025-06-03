// src/services/viacep.ts
import axios from "axios";

export interface EnderecoViaCEP {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCEP | null> {
  try {
    const { data } = await axios.get<EnderecoViaCEP>(`https://viacep.com.br/ws/${cep}/json/`);
    if (data.erro) return null;
    return data;
  } catch (err) {
    return null;
  }
}
