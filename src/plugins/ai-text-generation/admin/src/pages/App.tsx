import React, { useState } from 'react';
import {
  Main,
  Box,
  Typography,
  Button,
  TextInput,
  Textarea,
  Field,
  Flex,
  Alert,
} from '@strapi/design-system';
import { Sparkle, ArrowClockwise } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';

interface GenerationResult {
  type: 'success' | 'error';
  message: string;
  generatedText?: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedText, setGeneratedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const { post } = useFetchClient();

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim()) {
      setResult({ type: 'error', message: 'Please enter a prompt to generate text.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await post('/ai-text-generation/generate', {
        prompt: prompt.trim(),
      });

      if (response.data?.data?.text) {
        setGeneratedText(response.data.data.text);
        setResult({
          type: 'success',
          message: 'Text generated successfully!',
          generatedText: response.data.data.text,
        });
      } else {
        throw new Error('No text generated');
      }
    } catch (error: any) {
      console.error('Error generating text:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.error?.message || 'Failed to generate text. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    setPrompt('');
    setGeneratedText('');
    setResult(null);
  };

  const handleCopyToClipboard = async (): Promise<void> => {
    if (generatedText) {
      try {
        await navigator.clipboard.writeText(generatedText);
        setResult({
          type: 'success',
          message: 'Text copied to clipboard!',
        });
      } catch (error) {
        setResult({
          type: 'error',
          message: 'Failed to copy text to clipboard.',
        });
      }
    }
  };

  return (
    <Main>
      <Box padding={6}>
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="alpha" marginBottom={2}>
              AI Text Generation
            </Typography>
            <Typography variant="omega" textColor="neutral600">
              Generate content using Google Gemini AI
            </Typography>
          </Box>
          <Button
            onClick={handleClear}
            startIcon={<ArrowClockwise />}
            variant="tertiary"
          >
            Clear All
          </Button>
        </Flex>
      </Box>

      {result && (
        <Box padding={4}>
          <Alert
            title={result.type === 'success' ? 'Success' : 'Error'}
            variant={result.type === 'success' ? 'success' : 'danger'}
            onClose={() => setResult(null)}
            closeLabel="Close"
          >
            {result.message}
          </Alert>
        </Box>
      )}

      <Box padding={4}>
        <Box padding={4} background="neutral0" hasRadius shadow="tableShadow">
          <Typography variant="beta" marginBottom={4}>
            Generate Content
          </Typography>

          <Field.Root name="prompt" required>
            <Field.Label>Prompt</Field.Label>
            <Textarea
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here... (e.g., 'Write a blog post about sustainable technology')"
              rows={4}
            />
            <Field.Error />
            <Field.Hint>
              Describe what kind of content you want to generate. Be specific for better results.
            </Field.Hint>
          </Field.Root>

          <Box marginTop={4}>
            <Button
              onClick={handleGenerate}
              loading={loading}
              startIcon={<Sparkle />}
              variant="default"
              size="L"
              fullWidth
              disabled={!prompt.trim()}
            >
              Generate Text
            </Button>
          </Box>
        </Box>

        {generatedText && (
          <Box marginTop={4} padding={4} background="neutral0" hasRadius shadow="tableShadow">
            <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
              <Typography variant="beta">
                Generated Content
              </Typography>
              <Button
                onClick={handleCopyToClipboard}
                variant="secondary"
                size="S"
              >
                Copy to Clipboard
              </Button>
            </Flex>

            <Field.Root name="generatedText">
              <Field.Label>Generated Text</Field.Label>
              <Textarea
                name="generatedText"
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={20}
                style={{ fontFamily: 'monospace', minHeight: '400px' }}
              />
              <Field.Hint>
                You can edit the generated text before copying or using it.
              </Field.Hint>
            </Field.Root>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export default App;