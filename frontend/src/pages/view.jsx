import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, TrendingUp, FileText } from 'lucide-react';
import '../styles/pagestyles/view.css';

export default function ViewPage() {
  const [activeCard, setActiveCard] = useState(null);
  const navigate = useNavigate();

  const cards = [
    {
      id: 'master',
      title: 'View Master',
      desc: 'Browse and manage Excel master data. View all records, search, and filter by various criteria.',
      icon: Database,
      color: '#AEB784',
    },
    {
      id: 'outstanding',
      title: 'View Outstanding',
      desc: 'Track outstanding requests and pending items. Monitor progress and status updates.',
      icon: TrendingUp,
      color: '#AEB784',
    },
    {
      id: 'log',
      title: 'View Log',
      desc: 'Review activity logs and transaction history. Track all system events and user actions.',
      icon: FileText,
      color: '#AEB784',
    },
  ];

  const handleCardClick = (cardId) => {
    setActiveCard(cardId);
    if (cardId === 'master') {
      navigate('/viewdata');
    } else if (cardId === 'outstanding') {
      navigate('/view-outstandings');
    } else if (cardId === 'log') {
      navigate('/view-log');
    }
  };

  return (
    <div className="view-page">
      <div className="portal-cards-grid">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const cardClassName = `portal-card portal-card-${index + 1} ${activeCard === card.id ? 'active' : ''}`;
          return (
            <div
              key={card.id}
              className={cardClassName}
              onClick={() => handleCardClick(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardClick(card.id);
                }
              }}
            >
              <div className="portal-card-icon">
                <Icon size={40} color={card.color} />
              </div>
              <h2 className="portal-card-title">{card.title}</h2>
              <p className="portal-card-desc">{card.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
