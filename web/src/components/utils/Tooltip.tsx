import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';
import React, { useEffect } from 'react';
import { useAppSelector } from '../../store';
import SlotTooltip from '../inventory/SlotTooltip';

const Tooltip: React.FC = () => {
  const hoverData = useAppSelector((state) => state.tooltip);
  const open = Boolean(hoverData.open && hoverData.item && hoverData.inventoryType);

  const { refs, floatingStyles } = useFloating({
    open,
    strategy: 'fixed',
    placement: 'right-start',
    middleware: [flip(), shift(), offset({ mainAxis: 10, crossAxis: 10 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      refs.setPositionReference({
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: e.clientX,
            y: e.clientY,
            left: e.clientX,
            top: e.clientY,
            right: e.clientX,
            bottom: e.clientY,
          };
        },
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [refs]);

  if (!open || !hoverData.item || !hoverData.inventoryType) return null;

  return (
    <FloatingPortal>
      <SlotTooltip
        ref={refs.setFloating}
        style={{ ...floatingStyles, zIndex: 10000 }}
        item={hoverData.item}
        inventoryType={hoverData.inventoryType}
      />
    </FloatingPortal>
  );
};

export default Tooltip;
