export function listResponse(items, meta = {}) {
  return { items, ...meta };
}

export function parsePagination(query, defaults = {}) {
  const takeDefault = defaults.takeDefault ?? 20;
  const takeMax = defaults.takeMax ?? 100;
  const pageDefault = defaults.pageDefault ?? 1;

  const take = Math.min(Math.max(Number(query?.take) || takeDefault, 1), takeMax);
  const page = Math.max(Number(query?.page) || pageDefault, 1);
  return { take, page, skip: (page - 1) * take };
}
