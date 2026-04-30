import { format, formatDistanceToNow } from "date-fns";

export const fmtDate = (d) => format(new Date(d), "MMM d, yyyy");
export const fmtRelative = (d) => formatDistanceToNow(new Date(d), { addSuffix: true });
