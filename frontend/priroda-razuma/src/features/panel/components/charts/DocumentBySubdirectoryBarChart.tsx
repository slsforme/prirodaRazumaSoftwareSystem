import { AxiosError } from 'axios';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  ChartData,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LegendItem,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import api from '../../../services/api';
import { ChartProps, SubdirectoryResponse } from '../interfaces/charts.types';
import { getDaysFromRange } from './utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ApiErrorResponse {
  detail?: string;
}

export function DocumentBySubdirectoryBarChart({ dateRange }: ChartProps) {
  const [chartData, setChartData] = useState<ChartData<"bar">>({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          'rgba(125, 196, 89, 0.7)',
          'rgba(211, 226, 159, 0.7)',
          'rgba(163, 244, 159, 0.7)',
          'rgba(95, 179, 71, 0.7)',
          'rgba(173, 226, 93, 0.7)',
        ],
      },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const days = getDaysFromRange(dateRange);
        const { data } = await api.get<SubdirectoryResponse[]>(
          `/statistics/documents/subdirectories/${days}`
        );

        setChartData({
          labels: data.map(item => item.subdirectory),
          datasets: [
            {
              data: data.map(item => item.count),
              backgroundColor: [
                'rgba(125, 196, 89, 0.7)',
                'rgba(211, 226, 159, 0.7)',
                'rgba(163, 244, 159, 0.7)',
                'rgba(95, 179, 71, 0.7)',
                'rgba(173, 226, 93, 0.7)',
              ],
            },
          ],
        });
        setError(null);
      } catch (error) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        const errorMessage =
          axiosError.response?.data?.detail ||
          axiosError.message ||
          "Неизвестная ошибка";
        console.error('Ошибка загрузки данных:', errorMessage);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          filter: (legendItem: LegendItem) => legendItem.text !== undefined,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          maxRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
      },
    },
  };

  if (loading) return <div>Загрузка данных...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return <Bar options={options} data={chartData} />;
}