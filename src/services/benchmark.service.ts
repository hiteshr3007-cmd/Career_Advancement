import api from "../lib/api";
import { API_ENDPOINTS } from "../constants/api";
import { Benchmark, BenchmarkFilters, BenchmarkFormInput } from "../types/benchmark";

const benchmarkService = {
  listBenchmarks: async (filters: BenchmarkFilters): Promise<Benchmark[]> => {
    const response = await api.get<Benchmark[]>(API_ENDPOINTS.BENCHMARK.LIST, {
      params: filters,
    });
    return response.data;
  },

  getBenchmark: async (benchmarkId: string): Promise<Benchmark> => {
    const response = await api.get<Benchmark>(
      API_ENDPOINTS.BENCHMARK.DETAIL(benchmarkId)
    );
    return response.data;
  },

  createBenchmark: async (payload: BenchmarkFormInput): Promise<Benchmark> => {
    const response = await api.post<Benchmark>(API_ENDPOINTS.BENCHMARK.LIST, payload);
    return response.data;
  },

  updateBenchmark: async (
    benchmarkId: string,
    payload: Partial<BenchmarkFormInput>
  ): Promise<Benchmark> => {
    const response = await api.put<Benchmark>(
      API_ENDPOINTS.BENCHMARK.DETAIL(benchmarkId),
      payload
    );
    return response.data;
  },

  // The backend deactivate endpoint is a soft-delete (is_active -> false) and
  // returns no body, so callers should locally mark the benchmark inactive
  // rather than expect an updated record back.
  deactivateBenchmark: async (benchmarkId: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.BENCHMARK.DETAIL(benchmarkId));
  },

  // There's no dedicated reactivate endpoint; PUT with is_active: true does it.
  activateBenchmark: async (benchmarkId: string): Promise<Benchmark> => {
    const response = await api.put<Benchmark>(
      API_ENDPOINTS.BENCHMARK.DETAIL(benchmarkId),
      { is_active: true }
    );
    return response.data;
  },
};

export default benchmarkService;
