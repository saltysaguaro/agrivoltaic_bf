declare module "../src/public/solarPosition.js" {
  export function computeSolarPosition(input: {
    latitude: number;
    longitude: number;
    dateInput: string;
    minutesInDay: number;
    timeZone?: string;
  }): {
    utcDate: Date;
    timeZone: string;
    timeZoneOffsetMinutes: number;
    timeZoneOffsetLabel: string;
    localDateTimeLabel: string;
    equationOfTimeMinutes: number;
    declinationDeg: number;
    azimuthDeg: number;
    elevationDeg: number;
    apparentElevationDeg: number;
    isDaylight: boolean;
    isGoldenHour: boolean;
  };

  export function resolveSiteTimeZone(site: {
    longitude?: number;
    timezone?: string;
  }): string;

  export function zonedDateTimeToUtc(
    dateInput: string,
    minutesInDay: number,
    timeZone: string,
  ): {
    utcDate: Date;
    offsetMinutes: number;
  };
}
