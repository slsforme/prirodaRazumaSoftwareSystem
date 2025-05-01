import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../services/api";
import { DailyStat } from "../types/panel.types";

const DocumentsChart = () => {
  const [statsData, setStatsData] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const roleIdString = localStorage.getItem("role_id");
  const roleId = roleIdString ? parseInt(roleIdString, 10) : 0;
  const userId = localStorage.getItem("user_id") || "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const endpoint =
          roleId === 10
            ? "/statistics/documents/7"
            : `/statistics/documents/7/user/${userId}`;

        const response = await api.get(endpoint);
        setStatsData(response.data);
      } catch (err) {
        setError("Ошибка загрузки статистики");
        console.error("Ошибка получения данных:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId || roleId === 10) {
      fetchData();
    }
  }, [roleId, userId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-3">{error}</div>;
  }

  return (
    <div className="card border-light h-100">
      <div className="card-body d-flex flex-column p-2 p-md-3">
        <h5 className="card-title mb-2 mb-md-3 fs-6 fs-md-5">
          {roleId === 10
            ? "Количество загруженных документов за последнюю неделю"
            : "Ваша активность за последнюю неделю"}
        </h5>
        <div className="position-relative flex-grow-1">
          <ResponsiveContainer 
            width="100%" 
            height="100%"
            debounce={150}
          >
            <LineChart
              data={statsData}
              margin={{ 
                top: 10, 
                right: 15, 
                left: 5, 
                bottom: 15 
              }}
            >
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke="#e0e0e0"
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: "0.7rem",
                  fill: "#6c757d"
                }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short"
                  })
                }
              />
              <YAxis
                tick={{
                  fontSize: "0.7rem",
                  fill: "#6c757d"
                }}
                width={30}
              />
              <Tooltip
                labelFormatter={(date) =>
                  new Date(date).toLocaleDateString("ru-RU", {
                    weekday: 'short',
                    day: "numeric",
                    month: "long",
                  })
                }
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #D3E29F",
                  borderRadius: "6px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  fontSize: "0.8rem"
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#D3E29F"
                strokeWidth={1.5}
                name="Количество документов"
                dot={{ 
                  fill: "#D3E29F", 
                  strokeWidth: 1,
                  r: 3 
                }}
                activeDot={{
                  r: 5,
                  fill: "#A3F49F",
                  stroke: "#2c3e50"
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DocumentsChart;