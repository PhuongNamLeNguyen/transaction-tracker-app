interface IconProps {
    name: string;
    size?: number;
    filled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export function Icon({ name, size = 24, filled = false, className = "", style }: IconProps) {
    const opsz = size >= 40 ? 48 : size >= 24 ? 24 : 20;
    return (
        <span
            className={`material-symbols-rounded${className ? ` ${className}` : ""}`}
            style={{
                fontSize: size,
                fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${opsz}`,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
                flexShrink: 0,
                ...style,
            }}
            aria-hidden="true"
        >
            {name}
        </span>
    );
}
