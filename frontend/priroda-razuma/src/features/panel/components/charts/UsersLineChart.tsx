import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import api from "../../../services/api";
import { ChartProps, UserResponse } from '../interfaces/charts.types';
import { formatMonthLabel, getDaysFromRange } from './utils';
  
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function UsersLineChart({ dateRange }: ChartProps) {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [] as any[]
  });
  const [rawDates, setRawDates] = useState<string[]>([]);

  const groupByMonths = (data: UserResponse[]) => {
    const now = new Date();
    const monthlyData = new Map<string, number>();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData.set(monthKey, 0);
    }

    data.forEach(({ date, users_count }) => {
      const d = new Date(date);
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + users_count);
    });

    return Array.from(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month]) => ({
        month: new Date(`${month}-01`).toISOString(),
        count: monthlyData.get(month) || 0
      }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const days = getDaysFromRange(dateRange);
        const { data } = await api.get<UserResponse[]>(`/statistics/users/dynamics/${days}`);

        let labels: string[];
        let counts: number[];
        let dates: string[] = [];

        if (dateRange === 'year') {
          const monthlyData = groupByMonths(data);
          labels = monthlyData.map(({ month }) => formatMonthLabel(new Date(month)));
          counts = monthlyData.map(({ count }) => count);
          dates = monthlyData.map(({ month }) => month);
        } else {
          dates = data.map(({ date }) => date);
          labels = data.map(({ date }) => 
            new Date(date).toLocaleDateString('ru-RU', {
              month: 'short',
              day: 'numeric'
            })
          );
          counts = data.map(({ users_count }) => users_count);
        }

        setRawDates(dates);
        setChartData({
          labels,
          datasets: [{
            label: 'Пользователи',
            data: counts,
            borderColor: 'rgba(163, 244, 159, 0.7)',
            backgroundColor: 'rgba(163, 244, 159, 0.7)',
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          }]
        });

      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };

    loadData();
  }, [dateRange]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            if (dateRange === 'year') {
              return chartData.labels[context[0].dataIndex];
            }
            const index = context[0].dataIndex;
            const dateStr = rawDates[index];
            return new Date(dateStr).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: dateRange === 'year' ? 12 : 10
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0
        }
      }
    }
  };

  return <Line options={options} data={chartData} />;
}