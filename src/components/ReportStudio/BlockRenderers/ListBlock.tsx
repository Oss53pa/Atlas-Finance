import React from 'react';
import { cn } from '@/utils/cn';
import { ListBlock as ListBlockType, ListItem } from '@/types/reportStudio';

interface ListBlockProps {
  block: ListBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<ListBlockType>) => void;
}

export const ListBlock: React.FC<ListBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  const renderItems = (items: ListItem[], depth: number = 0) => {
    return items.map((item) => (
      <li key={item.id} className="my-1">
        <span
          contentEditable={isEditable}
          suppressContentEditableWarning
          className={cn(
            isEditable && 'outline-none focus:bg-blue-50 rounded px-1'
          )}
        >
          {item.content}
        </span>
        {item.children && item.children.length > 0 && (
          <List type={block.listType} depth={depth + 1}>
            {renderItems(item.children, depth + 1)}
          </List>
        )}
      </li>
    ));
  };

  return (
    <List type={block.listType} depth={0}>
      {renderItems(block.items)}
    </List>
  );
};

interface ListProps {
  type: 'bullet' | 'numbered';
  depth: number;
  children: React.ReactNode;
}

const List: React.FC<ListProps> = ({ type, depth, children }) => {
  const bulletStyles = ['disc', 'circle', 'square'];
  const numberedStyles = ['decimal', 'lower-alpha', 'lower-roman'];

  if (type === 'bullet') {
    return (
      <ul
        className="text-gray-700 pl-5"
        style={{ listStyleType: bulletStyles[depth % bulletStyles.length] }}
      >
        {children}
      </ul>
    );
  }

  return (
    <ol
      className="text-gray-700 pl-5"
      style={{ listStyleType: numberedStyles[depth % numberedStyles.length] }}
    >
      {children}
    </ol>
  );
};
