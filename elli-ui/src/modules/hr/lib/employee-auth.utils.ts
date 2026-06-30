export function generateEmployeePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}
