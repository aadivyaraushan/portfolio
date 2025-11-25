import React from 'react';
import { render, screen } from '@testing-library/react';
import InventorySlot from '../../components/inventory/InventorySlot';
import InventoryGrid from '../../components/inventory/InventoryGrid';
import CraftingArea from '../../components/inventory/CraftingArea';
import EquipmentColumn from '../../components/inventory/EquipmentColumn';
import UtilityColumn from '../../components/inventory/UtilityColumn';
import InventoryScreen from '../../components/inventory/InventoryScreen';
import { HelmetIcon, ChestplateIcon, LeggingsIcon, BootsIcon, ShieldIcon, BookIcon } from '../../components/inventory/icons';

describe('Inventory UI components', () => {
  it('InventorySlot renders provided children and classes', () => {
    const { container } = render(
      <InventorySlot className="extra-class">
        <span>Item inside</span>
      </InventorySlot>,
    );

    expect(container.firstChild).toHaveClass('cell', 'extra-class');
    expect(screen.getByText('Item inside')).toBeInTheDocument();
  });

  it('InventoryGrid renders all slots', () => {
    const { container } = render(<InventoryGrid />);
    expect(container.querySelectorAll('.cell')).toHaveLength(36);
  });

  it('CraftingArea exposes crafting controls', () => {
    render(<CraftingArea />);
    expect(screen.getByText('Crafting')).toBeInTheDocument();
    expect(screen.getByTitle('Crafting output')).toBeInTheDocument();
  });

  it('EquipmentColumn exposes accessibility labels for armor slots', () => {
    render(<EquipmentColumn />);
    expect(screen.getByLabelText('Helmet slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Chestplate slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Leggings slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Boots slot')).toBeInTheDocument();
  });

  it('UtilityColumn renders shield and book slots', () => {
    render(<UtilityColumn />);
    expect(screen.getByTitle('Offhand / shield')).toBeInTheDocument();
    expect(screen.getByTitle('Recipe book')).toBeInTheDocument();
  });

  it('InventoryScreen renders armor, grid, and hotbar cells', () => {
    const { container } = render(<InventoryScreen />);
    expect(container.querySelectorAll('.cell')).toHaveLength(41);
  });

  it('Individual icon components expose semantic labels', () => {
    render(
      <>
        <HelmetIcon />
        <ChestplateIcon />
        <LeggingsIcon />
        <BootsIcon />
        <ShieldIcon />
        <BookIcon />
      </>,
    );

    expect(screen.getByLabelText('Helmet slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Chestplate slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Leggings slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Boots slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Shield slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipe book')).toBeInTheDocument();
  });
});
