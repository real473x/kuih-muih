"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Loader2 } from "lucide-react";
import clsx from "clsx";

interface WeatherData {
    temperature: number;
    weathercode: number;
}

export function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sibu Coordinates: 2.3000° N, 111.8167° E
        const fetchWeather = async () => {
            try {
                const res = await fetch(
                    "https://api.open-meteo.com/v1/forecast?latitude=2.3000&longitude=111.8167&current_weather=true"
                );
                const data = await res.json();
                setWeather({
                    temperature: data.current_weather.temperature,
                    weathercode: data.current_weather.weathercode,
                });
            } catch (error) {
                console.error("Failed to fetch weather", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, []);

    if (loading) return <div className="animate-pulse h-16 w-full bg-blue-50 dark:bg-blue-900/20 rounded-xl" />;

    if (!weather) return null;

    // Simple WMO weather code interpretation
    // 0-3: Clear/Cloudy, 51-67: Rain, 80-82: Showers, 95+: Thunderstorm
    const isRaining = weather.weathercode >= 51;
    const isCloudy = weather.weathercode > 3 && weather.weathercode < 51;

    return (
        <div className={clsx(
            "rounded-xl p-4 flex items-center justify-between text-white shadow-lg mb-6",
            isRaining ? "bg-gradient-to-r from-slate-700 to-slate-900" : "bg-gradient-to-r from-blue-400 to-blue-600"
        )}>
            <div>
                <h3 className="font-bold text-lg">Sibu Weather</h3>
                <p className="text-sm opacity-90">
                    {isRaining ? "It's raining! Expect fewer customers." : "Good weather for selling!"}
                </p>
            </div>
            <div className="flex items-center space-x-2">
                {isRaining ? (
                    <CloudRain className="w-8 h-8" />
                ) : isCloudy ? (
                    <Cloud className="w-8 h-8" />
                ) : (
                    <Sun className="w-8 h-8" />
                )}
                <span className="text-2xl font-bold">{weather.temperature}°C</span>
            </div>
        </div>
    );
}
