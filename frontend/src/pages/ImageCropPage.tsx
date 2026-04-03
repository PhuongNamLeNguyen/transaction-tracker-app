import { useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import type { TransactionType } from "@/api/transactions.api";
import "@/styles/image-crop.css";

interface LocationState {
    file: File;
    type: TransactionType;
}

function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<File> {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
    );
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => {
                if (!b) { reject(new Error("toBlob failed")); return; }
                resolve(new File([b], "cropped.jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.92,
        );
    });
}

export function ImageCropPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;

    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isProcessing, setIsProcessing] = useState(false);

    const imageUrl = useMemo(
        () => (state?.file ? URL.createObjectURL(state.file) : ""),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    async function handleConfirm() {
        if (!completedCrop || !imgRef.current || !state) return;
        setIsProcessing(true);
        try {
            const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
            navigate("/receipt-review", {
                state: { file: croppedFile, type: state.type },
                replace: true,
            });
        } finally {
            setIsProcessing(false);
        }
    }

    if (!state?.file) {
        navigate("/", { replace: true });
        return null;
    }

    return (
        <div className="crop-page">
            <header className="crop-header">
                <button
                    className="crop-header__btn"
                    onClick={() => navigate(-1)}
                    disabled={isProcessing}
                    type="button"
                >
                    Hủy
                </button>
                <h1 className="crop-header__title">Cắt ảnh</h1>
                <button
                    className="crop-header__btn crop-header__btn--confirm"
                    onClick={handleConfirm}
                    disabled={isProcessing || !completedCrop}
                    type="button"
                >
                    {isProcessing ? "..." : "Xong"}
                </button>
            </header>

            <div className="crop-container">
                <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={undefined}
                    keepSelection
                    className="crop-react"
                >
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Hóa đơn"
                        className="crop-img"
                    />
                </ReactCrop>
            </div>

            <div className="crop-hint">
                Kéo góc hoặc cạnh để điều chỉnh vùng cắt
            </div>
        </div>
    );
}
