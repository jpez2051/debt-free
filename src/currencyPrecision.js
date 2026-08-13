const OriginalNumberFormat = Intl.NumberFormat
Intl.NumberFormat = function(locales, options = {}) {
  const next = options?.style === 'currency' ? { ...options, minimumFractionDigits: 2, maximumFractionDigits: 2 } : options
  return new OriginalNumberFormat(locales, next)
}
Intl.NumberFormat.prototype = OriginalNumberFormat.prototype
Intl.NumberFormat.supportedLocalesOf = OriginalNumberFormat.supportedLocalesOf.bind(OriginalNumberFormat)
