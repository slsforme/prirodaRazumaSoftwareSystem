import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import api from "../../../services/api";
import { ChartProps, RoleResponse } from '../interfaces/charts.types';
import { getDaysFromRange } from "./utils";

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

export function UsersByRolesPieChart({ dateRange }: ChartProps) {
    const [chartData, setChartData] = useState({
      labels: [] as string[],
      datasets: [] as any[]
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          const days = getDaysFromRange(dateRange);
          const { data } = await api.get<RoleResponse[]>(
            `/statistics/roles/count/${days}`
          );
  
          setChartData({
            labels: data.map(item => item.role),
            datasets: [{
              data: data.map(item => item.count),
              backgroundColor: [
                '#7DC459',
                '#D3E29F',
                '#A3F49F',
                '#5FB347',
                '#ADE25D',
              ],
              borderWidth: 1,
            }]
          });
          setError(null);
        } catch (error) {
          console.error('Ошибка загрузки данных:', error);
          setError('Не удалось загрузить данные');
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }, [dateRange]);
  
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right' as const,
        },
      }
    };
  
    if (loading) return <div>Загрузка данных...</div>;
    if (error) return <div>Ошибка: {error}</div>;
  
    return <Pie options={options} data={chartData} />;
  }
  