/**
 * Tope de candidatos por consulta al asistente, para controlar el costo en
 * tokens. Vive fuera de `service.ts` —que es `server-only`— porque el front
 * también tiene que conocerlo: la lista se poda en el cliente y frenar ahí
 * evita mandar una consulta que el server va a rechazar igual.
 */
export const MAX_CANDIDATOS_SELECCION = 10
