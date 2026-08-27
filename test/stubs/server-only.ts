// `server-only` no es un paquete real: Next lo resuelve en build para abortar si
// un módulo de servidor termina en el bundle del cliente. Bajo vitest no existe
// ese riesgo ni ese resolver, así que se aliasea a este módulo vacío para poder
// testear los módulos de servidor tal como se importan en producción.
export {}
