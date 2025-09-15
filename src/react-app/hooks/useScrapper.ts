import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { ScrapperData, ScrapperSettings } from '@/shared/types';

export function useScrapper() {
  const [data, setData] = useState<ScrapperData[]>([]);
  const [settings, setSettings] = useState<ScrapperSettings | null>(null);
  const { request, loading, error } = useApi();

  const fetchData = useCallback(async () => {
    try {
      const response = await request('/api/scrapper/data');
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch scrapper data:', err);
    }
  }, [request]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await request('/api/scrapper/settings');
      setSettings(response.settings);
    } catch (err) {
      console.error('Failed to fetch scrapper settings:', err);
    }
  }, [request]);

  const addData = useCallback(async (dataLines: string[]) => {
    try {
      const response = await request('/api/scrapper/data', {
        method: 'POST',
        body: { data_lines: dataLines },
      });
      await fetchData(); // Refresh data
      return response;
    } catch (err) {
      console.error('Failed to add scrapper data:', err);
      throw err;
    }
  }, [request, fetchData]);

  const updateSettings = useCallback(async (newSettings: {
    lines_per_user: number;
    selected_users: number[];
    timer_interval: number;
    is_active: boolean;
  }) => {
    try {
      const response = await request('/api/scrapper/settings', {
        method: 'PUT',
        body: newSettings,
      });
      setSettings(response.settings);
      return response.settings;
    } catch (err) {
      console.error('Failed to update scrapper settings:', err);
      throw err;
    }
  }, [request]);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [fetchData, fetchSettings]);

  return {
    data,
    settings,
    loading,
    error,
    addData,
    updateSettings,
    refreshData: fetchData,
    refreshSettings: fetchSettings,
  };
}
