import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import cls from './OverflowTooltip.module.scss';

const SHOW_TOOLTIP_DELAY_MS = 1000;
const TOOLTIP_VIEWPORT_MARGIN = 12;
const TOOLTIP_VERTICAL_OFFSET = 8;
const ESTIMATED_TOOLTIP_HEIGHT = 72;

type TooltipPosition = {
    left: number;
    placement: 'top' | 'bottom';
    top: number;
};

type OverflowTooltipProps = {
    className?: string;
    text: string;
};

const getClampedLeftPosition = (left: number) => {
    return Math.min(
        Math.max(left, TOOLTIP_VIEWPORT_MARGIN),
        window.innerWidth - TOOLTIP_VIEWPORT_MARGIN,
    );
};

const OverflowTooltip = ({ className, text }: OverflowTooltipProps) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

    const clearTooltipTimer = useCallback(() => {
        if (!timerRef.current) return;

        clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const checkOverflow = useCallback(() => {
        const element = textRef.current;

        if (!element) return false;

        const isTextOverflowing = element.scrollWidth > element.clientWidth + 1;

        setIsOverflowing(isTextOverflowing);

        if (!isTextOverflowing) {
            clearTooltipTimer();
            setTooltipPosition(null);
        }

        return isTextOverflowing;
    }, [clearTooltipTimer]);

    const updateTooltipPosition = useCallback(() => {
        const element = textRef.current;

        if (!element) return;

        const rect = element.getBoundingClientRect();
        const shouldShowAbove = rect.bottom + ESTIMATED_TOOLTIP_HEIGHT > window.innerHeight;

        setTooltipPosition({
            left: getClampedLeftPosition(rect.left + rect.width / 2),
            placement: shouldShowAbove ? 'top' : 'bottom',
            top: shouldShowAbove
                ? rect.top - TOOLTIP_VERTICAL_OFFSET
                : rect.bottom + TOOLTIP_VERTICAL_OFFSET,
        });
    }, []);

    const onMouseEnter = () => {
        clearTooltipTimer();

        if (!checkOverflow()) return;

        timerRef.current = setTimeout(() => {
            updateTooltipPosition();
        }, SHOW_TOOLTIP_DELAY_MS);
    };

    const onMouseLeave = () => {
        clearTooltipTimer();
        setTooltipPosition(null);
    };

    useEffect(() => {
        checkOverflow();

        const element = textRef.current;
        const resizeObserver = element ? new ResizeObserver(checkOverflow) : null;

        if (element) {
            resizeObserver?.observe(element);
        }

        window.addEventListener('resize', checkOverflow);

        return () => {
            clearTooltipTimer();
            resizeObserver?.disconnect();
            window.removeEventListener('resize', checkOverflow);
        };
    }, [checkOverflow, clearTooltipTimer, text]);

    useEffect(() => {
        setTooltipPosition(null);
        clearTooltipTimer();
        checkOverflow();
    }, [checkOverflow, clearTooltipTimer, text]);

    const tooltipClassName = tooltipPosition?.placement === 'top'
        ? `${cls.tooltip} ${cls.tooltipTop}`
        : `${cls.tooltip} ${cls.tooltipBottom}`;

    return (
        <>
            <span
                ref={textRef}
                className={className}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                {text}
            </span>
            {tooltipPosition && isOverflowing && createPortal(
                <div
                    className={tooltipClassName}
                    style={{
                        left: tooltipPosition.left,
                        top: tooltipPosition.top,
                    }}
                >
                    {text}
                </div>,
                document.body,
            )}
        </>
    );
};

export default OverflowTooltip;
