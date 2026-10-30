// Contas públicas de demonstração. Os hashes PBKDF2 não substituem autenticação de servidor.
export const DEMO_USERS = [
  {
    id: 'user-1',
    name: 'Mariana Costa',
    email: 'demo@labware.com.br',
    role: 'support',
    salt: '40e78180f13201c0d480ea38fca6ca74',
    passwordHash: 'b82ce78d2ee4aea87a4cee2fe63cff9a478dab03b864a144cb44bb4eb31b22ca',
  },
  {
    id: 'user-3',
    name: 'Fidalgo',
    email: 'cliente@labware.com.br',
    role: 'client',
    salt: 'af5254abc515aa5784b9f5a96a96a01e',
    passwordHash: 'c02ba7743a04ff6cb5d3fa592c46064dc7841b1a2ca2ec77276f8c636dec3710',
  },
];
