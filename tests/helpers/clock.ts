/**
 * Moves the process clock to `iso` while letting it keep ticking (node:test's mock timers freeze
 * time, which stalls PGlite and grammY). Tests whose typed dates ("by 20 Nov") are read relative
 * to today call this first, so they don't start failing as the calendar moves on.
 */
export function shiftClock(iso: string) {
  const RealDate = Date;
  const offset = RealDate.parse(iso) - RealDate.now();
  class ShiftedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...(args as [string]));
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ShiftedDate as DateConstructor;
}
