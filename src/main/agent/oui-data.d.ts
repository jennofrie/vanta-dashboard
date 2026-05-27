/**
 * Ambient type declaration for oui-data.
 * oui-data is a JSON object keyed by uppercase 6-char hex OUI (e.g. "FCFBFB"),
 * with multi-line string values: "Org Name\nAddress\nCity State ZIP\nCountry".
 * No type declarations ship with the package.
 */
declare module 'oui-data' {
  const data: Record<string, string>
  export default data
}
