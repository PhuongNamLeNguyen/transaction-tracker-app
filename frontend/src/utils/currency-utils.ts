import { TransactionType } from "@/types";

export const formatCurrency = (
    amount: number,
    currency: string,
    locale = "en",
): string =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
        amount,
    );

export const formatTransactionAmount = (
    amount: number,
    currency: string,
    type: TransactionType,
    locale = "en",
): string => {
    const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(amount);

    // income: +, expense/investment/saving: − (typographic minus U+2212)
    return type === TransactionType.INCOME
        ? `+${formatted}`
        : `\u2212${formatted}`;
};

export const convertCurrency = (amount: number, rate: number): number =>
    Math.round(amount * rate);
