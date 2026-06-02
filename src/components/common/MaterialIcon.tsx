import React from 'react';

interface MaterialIconProps {
  name: string;
  filled?: boolean;
  className?: string;
  onClick?: () => void;
}

const MaterialIcon: React.FC<MaterialIconProps> = ({ name, filled = false, className = '', onClick }) => (
  <span 
    className={`material-symbols-outlined ${className}`} 
    style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
    onClick={onClick}
  >
    {name}
  </span>
);

export default MaterialIcon;
