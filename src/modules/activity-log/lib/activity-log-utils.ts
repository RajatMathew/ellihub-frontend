export function formatActivityDate(timestamp: string) {
  const date = new Date(timestamp);

  return {
    date: date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function shortenId(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}
