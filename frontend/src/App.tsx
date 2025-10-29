import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
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
      <Toaster position="bottom-right" theme="dark" richColors />
      <ScenarioView scenarioId="default" />
    </QueryClientProvider>
  );
}

export default App;
