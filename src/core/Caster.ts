export class Caster {
  /**
   * Casts a string to its native boolean or number representation.
   * If it doesn't match either, it returns the original string.
   */
  static cast(value: string): string | number | boolean {
    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === 'true';
    }
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    return value;
  }
}
