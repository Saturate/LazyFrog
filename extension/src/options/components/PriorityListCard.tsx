/**
 * Reusable Priority List Card Component
 * Used for Ability Pick Order and Blessing Stat Pick Order
 */

import React, { useState } from 'react';
import { GripVertical, Plus, X, LucideIcon } from 'lucide-react';

interface PriorityListCardProps {
  title: string;
  icon: LucideIcon;
  description: string;
  matchingHint: string;
  items: string[];
  discoveredItems: string[];
  inputPlaceholder: string;
  emptyMessage: string;
  accentColor: string; // e.g., '#3b82f6' for blue, '#22c55e' for green
  onItemsChange: (items: string[]) => void;
}

export const PriorityListCard: React.FC<PriorityListCardProps> = ({
  title,
  icon: Icon,
  description,
  matchingHint,
  items,
  discoveredItems,
  inputPlaceholder,
  emptyMessage,
  accentColor,
  onItemsChange,
}) => {
  const [newItem, setNewItem] = useState('');

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const newList = [...items];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);

    onItemsChange(newList);
  };

  // Add custom item
  const handleAddItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onItemsChange([...items, trimmed]);
      setNewItem('');
    }
  };

  // Add discovered item
  const handleAddDiscoveredItem = (item: string) => {
    if (!items.includes(item)) {
      onItemsChange([...items, item]);
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const newList = [...items];
    newList.splice(index, 1);
    onItemsChange(newList);
  };

  return (
    <div className="card">
      <h2>
        <Icon size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
        {title}
      </h2>
      <p style={{ color: '#a1a1aa', marginBottom: '16px', fontSize: '14px' }}>
        {description}
        <br />
        <span style={{ fontSize: '13px', color: '#71717a' }}>
          {matchingHint}
        </span>
      </p>

      {/* Add item input */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder={inputPlaceholder}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#171717',
            border: '1px solid #27272a',
            borderRadius: '6px',
            color: '#e5e5e5',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleAddItem}
          style={{
            padding: '8px 16px',
            background: accentColor,
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Discovered items */}
      {discoveredItems.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}>
          <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>
            Discovered items (click to add to pick order):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {discoveredItems
              .filter(item => !items.includes(item))
              .map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleAddDiscoveredItem(item)}
                  style={{
                    padding: '4px 10px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3f3f46';
                    e.currentTarget.style.color = '#e5e5e5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#27272a';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  + {item}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Priority list */}
      {items.length === 0 ? (
        <p style={{ color: '#71717a', fontSize: '14px', fontStyle: 'italic' }}>
          {emptyMessage}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#171717',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
                cursor: 'move',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1f1f1f'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#171717'}
            >
              <GripVertical size={16} style={{ color: '#71717a' }} />
              <span style={{ fontSize: '14px', fontWeight: '600', color: accentColor, minWidth: '30px' }}>
                {index + 1}
              </span>
              <span style={{ fontSize: '14px', color: '#e5e5e5', flex: 1 }}>{item}</span>
              <button
                onClick={() => handleRemoveItem(index)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
