export const getDaysFromRange = (range: string): number => {
    const daysMap: Record<string, number> = {
      'week': 7,
      'month': 31,
      'quarter': 90,
      'year': 365
    };
    return daysMap[range] || 30;
};
  
export const formatMonthLabel = (date: Date): string => {
    return date.toLocaleDateString('ru-RU', {
      month: 'short',
      year: 'numeric'
    }).replace('.', '');
};

export const groupByMonths = (data: Array<{ date: string; count: number }>) => {
  const now = new Date();
  const monthlyData = new Map<string, number>();
  
  for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData.set(monthKey, 0);
  }
  
  data.forEach(({ date, count }) => {
      const d = new Date(date);
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + count);
  });
  
  return Array.from(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
      month: new Date(`${month}-01`).toISOString(),
      count
      }));
  };