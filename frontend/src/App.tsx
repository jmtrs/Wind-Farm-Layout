import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScenarioView } from './features/scenario/ScenarioView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScenarioView scenarioId="default" />
    </QueryClientProvider>
  );
}

export default App;
