import React from 'react';

/**
 * Editorial Brutalist Numbered Pagination Component
 * Renders Previous, direct page number squares (1, 2, 3, ..., N), and Next.
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const items = getPaginationItems();

  return (
    <div
      className="flex items-center gap-xs font-mono"
      style={{
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
      }}
    >
      {/* Previous Button */}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        style={{
          height: '30px',
          padding: '0 0.75rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: page <= 1 ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
          borderRadius: '2px',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          if (page > 1) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (page > 1) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }
        }}
      >
        Previous
      </button>

      {/* Numbered Page Squares & Ellipses */}
      {items.map((item, idx) => {
        if (item === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              style={{
                minWidth: '26px',
                height: '30px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '0.75rem',
              }}
            >
              ...
            </span>
          );
        }

        const isActive = item === page;

        return (
          <button
            key={`page-${item}`}
            type="button"
            onClick={() => onPageChange(item)}
            style={{
              minWidth: '30px',
              height: '30px',
              padding: '0 0.45rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: isActive ? 700 : 500,
              background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
              color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.75)',
              border: `1px solid ${isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.12)'}`,
              cursor: isActive ? 'default' : 'pointer',
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }
            }}
          >
            {item}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        style={{
          height: '30px',
          padding: '0 0.75rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: page >= totalPages ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
          borderRadius: '2px',
          cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          if (page < totalPages) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (page < totalPages) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }
        }}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
