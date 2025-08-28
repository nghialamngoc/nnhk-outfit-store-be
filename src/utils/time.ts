export const parseExpiresInToMs = (expiresIn: string): number => {
  const timeUnits: { [key: string]: number } = {
    s: 1000, // seconds
    m: 1000 * 60, // minutes
    h: 1000 * 60 * 60, // hours
    d: 1000 * 60 * 60 * 24, // days
  };

  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * timeUnits[unit];
};
