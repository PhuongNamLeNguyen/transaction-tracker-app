import { useState, useEffect } from "react";
import { Theme } from "@/types";

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(Theme.LIGHT);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const toggle = () =>
        setTheme((prev) => (prev === Theme.LIGHT ? Theme.DARK : Theme.LIGHT));

    return { theme, setTheme, toggle };
};
