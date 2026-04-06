import { useState, useEffect } from 'react';
import { NewsItem } from '../types';
import { formatDate } from '../utils/translate';
import { SOURCE_INFO } from '../data/sources';

interface Props { item: NewsItem; lang: string; onClose: () => void; }
export function NewsModal({ item, lang, onClose }: Props) {
  const info = SOURCE_INFO[item.source] || { label: item.source || 'News', color: '#666', region: '' };
  const title = item.titleTL[lang] || item.title;
  const summary = item.summaryTL[lang] || item.summary;
  const isTranslated = !!item.titleTL[lang];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleBackdrop(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <span className="source-tag" style={{ background: info.color }}>{info.label}</span>
            {info.region && <span className="source-region">{info.region}</span>}
            <span style={{ fontSize: '0.65em', color: '#aaa' }}>{formatDate(item.pubDate)}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉">✕</button>
        </div>

        {item.imageUrl && (
          <img className="modal-image" src={item.imageUrl} alt={title} onError={e => (e.target as HTMLImageElement).style.display='none'} />
        )}

        <div className="modal-body">
          <h2 className="modal-title">{title}</h2>
          {isTranslated && (
            <div className="card-orig" style={{ fontSize: '0.7em', marginBottom: 8 }}>
              原文: {item.title.slice(0, 80)}{item.title.length > 80 ? '…' : ''}
            </div>
          )}
          <p className="modal-summary">{summary || '暂无摘要'}</p>
        </div>

        <div className="modal-footer">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="read-link" style={{ fontSize: '0.85em', padding: '8px 18px' }}>
            閱讀原文 ↗
          </a>
          <button onClick={onClose} className="modal-close-btn">返回</button>
        </div>
      </div>
    </div>
  );
}
