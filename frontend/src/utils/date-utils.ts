export const formatDate = (iso: string, locale = "en"): string =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(iso),
    );

export const todayIso = (): string => new Date().toISOString().split("T")[0];
