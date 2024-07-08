export default class ParserHelper {
  static parseToKebabCase(value: any): Promise<void> {
    return value
      .replace(/([a-z])([A-Z])/g, '$1-$2') // get all lowercase letters that are near to uppercase ones
      .replace(/[\W_]+/g, '-') // replace all spaces and low dash
      .toLowerCase(); // convert to lower case
  }

  /**
   Removes special characters from a string. Used to make branch names easier to handle for TDS
   */
  static removeSpecialCharacters(value: string): string {
    return value.replace(/[-_/]/g, '');
  }

  /**
     Capitalize words in a string.
     */
  static capitalizeWords(value: string): string {
    return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
}
