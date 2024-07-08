import { faker } from '@faker-js/faker';
import moment, { Moment } from 'moment';

export interface YYYYMMDD {
  year: string;
  month: string;
  day: string;
  moment: moment.Moment;
}

export default class Generator {
  getRandomString(length: number, alphaNumericFlag = '', upperCase = false): string {
    alphaNumericFlag = alphaNumericFlag.toLowerCase();

    let tokens = '';
    if (alphaNumericFlag !== 'a') {
      tokens += '0123456789';
    }
    if (alphaNumericFlag !== 'n') {
      tokens += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (!upperCase) {
        tokens += 'abcdefghijklmnopqrstuvwxyz';
      }
    }

    let value = '';
    for (let i = 0; i < length; i++) {
      value += tokens.charAt(Math.random() * tokens.length);
    }
    return value;
  }

  getRandomIban(): string {
    return faker.finance.iban();
  }

  getRandomVin(): string {
    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    const digits = '0123456789';

    let value = '';
    for (let i = 0; i < 11; i++) {
      value += getRandomCharacterInString(letters + digits);
    }
    for (let i = 0; i < 6; i++) {
      value += getRandomCharacterInString(digits);
    }
    return value;
  }

  getRandomRegistrationPlate(): string {
    return this.getRandomString(4, '', true) + '-' + this.randomNumberAsString(1000);
  }

  randomNumberAsString(max = 10000): string {
    const preFixxedString = '0000000000' + Math.round(Math.random() * max).toString();
    return preFixxedString.substring(preFixxedString.length - `${max}`.length, preFixxedString.length);
  }

  getRandomStringForToday(): string {
    return `${moment().format('DDMM')}-${this.getRandomString(5)}`;
  }

  getRandomDateAsMoment(): Moment {
    return moment(new Date(+new Date() - Math.floor(Math.random() * 10000000000)));
  }

  getRandomDateAsString(format: string): string {
    return this.getRandomDateAsMoment().format(format);
  }

  getDateFromPast(yearsBack: number, daysBack: number, format: string): string {
    return moment().subtract(yearsBack, 'years').subtract(daysBack, 'days').format(format);
  }

  getCurrentDateWithFormat(dateFormat: string): string {
    return moment().format(dateFormat);
  }

  getFutureDateInDaysWithFormat(addDays: number, dateFormat: string): string {
    return moment().add(addDays, 'days').format(dateFormat);
  }

  getFutureFromDateInDaysWithFormat(date: string, addDays: number, dateFormat: string): string {
    return moment(date, dateFormat).add(addDays, 'days').format(dateFormat);
  }

  formatDate(date: string, inputDateFormat: string, dateFormat: string): string {
    return moment(date, inputDateFormat).format(dateFormat);
  }

  getToday(): YYYYMMDD {
    const date = moment();
    return {
      year: date.format('YYYY'),
      month: date.format('MMM'),
      day: date.format('D'),
      moment: date,
    };
  }

  getFirstDayOfNextMonth(): YYYYMMDD {
    const date = moment().add(1, 'months').startOf('month');
    return {
      year: date.format('YYYY'),
      month: date.format('MMM'),
      day: date.format('D'),
      moment: date,
    };
  }

  getLastDayOfCurrentMonthAsDay(): string {
    return moment().endOf('month').format('D');
  }

  getLastDateOfCurrentMonth(): YYYYMMDD {
    const date = moment().endOf('month');
    return {
      year: date.format('YYYY'),
      month: date.format('MMM'),
      day: date.format('DD'),
      moment: date,
    };
  }

  getLastDateOfNextMonth(): YYYYMMDD {
    const date = moment().add(1, 'month').endOf('month');
    return {
      year: date.format('YYYY'),
      month: date.format('MMM'),
      day: date.format('DD'),
      moment: date,
    };
  }

  getStringBasedOnCurrentTime(): string {
    return new Date().getTime().toString();
  }
}

function getRandomCharacterInString(possibleValues: string): string {
  return possibleValues.charAt(Math.random() * possibleValues.length);
}
