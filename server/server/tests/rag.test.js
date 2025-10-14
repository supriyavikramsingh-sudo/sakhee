// server/tests/rag.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { retriever } from '../src/langchain/retriever.js';
import { vectorStoreManager } from '../src/langchain/vectorStore.js';
import { chatChain } from '../src/langchain/chains/chatChain.js';

describe('RAG Pipeline - Data Structure Tests', () => {
  describe('VectorStore Document Structure', () => {
    it('should return documents with both content and pageContent properties', async () => {
      const mockQuery = 'PCOS symptoms';
      const results = await vectorStoreManager.similaritySearch(mockQuery, 3);

      expect(Array.isArray(results)).toBe(true);

      results.forEach((doc) => {
        // Both properties should exist
        expect(doc).toHaveProperty('content');
        expect(doc).toHaveProperty('pageContent');
        expect(doc).toHaveProperty('metadata');
        expect(doc).toHaveProperty('score');

        // Both should have the same value
        expect(doc.content).toBe(doc.pageContent);

        // Content should be a string
        expect(typeof doc.content).toBe('string');
      });
    });

    it('should handle empty queries gracefully', async () => {
      const results = await vectorStoreManager.similaritySearch('', 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle invalid queries without crashing', async () => {
      const invalidQueries = [null, undefined, 123, {}, []];

      for (const query of invalidQueries) {
        const results = await vectorStoreManager.similaritySearch(query, 5);
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(0);
      }
    });
  });

  describe('Retriever Document Normalization', () => {
    it('should normalize documents correctly', () => {
      const testCases = [
        // Test with 'content' property
        {
          input: { content: 'Test content', metadata: { source: 'test.txt' }, score: 0.9 },
          expected: {
            content: 'Test content',
            pageContent: 'Test content',
            metadata: { source: 'test.txt' },
            score: 0.9,
          },
        },
        // Test with 'pageContent' property
        {
          input: {
            pageContent: 'Test content',
            metadata: { source: 'test.txt' },
            score: 0.9,
          },
          expected: {
            content: 'Test content',
            pageContent: 'Test content',
            metadata: { source: 'test.txt' },
            score: 0.9,
          },
        },
        // Test with empty content
        {
          input: { content: '', metadata: {}, score: 0.5 },
          expected: {
            content: '',
            pageContent: '',
            metadata: {},
            score: 0.5,
          },
        },
        // Test with null input
        {
          input: null,
          expected: {
            content: '',
            pageContent: '',
            metadata: {},
            score: 0,
          },
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = retriever.normalizeDocument(input);
        expect(result).toMatchObject(expected);
      });
    });

    it('should retrieve documents with normalized structure', async () => {
      const results = await retriever.retrieve('PCOS management', { topK: 5 });

      expect(Array.isArray(results)).toBe(true);

      results.forEach((doc) => {
        expect(doc).toHaveProperty('content');
        expect(doc).toHaveProperty('pageContent');
        expect(doc.content).toBe(doc.pageContent);
        expect(typeof doc.content).toBe('string');
        expect(doc).toHaveProperty('metadata');
        expect(doc).toHaveProperty('score');
      });
    });

    it('should format context from results without errors', async () => {
      const results = await retriever.retrieve('PCOS diet', { topK: 3 });
      const context = retriever.formatContextFromResults(results);

      expect(typeof context).toBe('string');
      // Should not contain undefined or null references
      expect(context).not.toContain('undefined');
      expect(context).not.toContain('null');
    });
  });

  describe('ChatChain Source Compilation', () => {
    it('should safely extract content from documents', () => {
      const testDocs = [
        { content: 'Test content 1', metadata: { source: 'test1.txt' } },
        { pageContent: 'Test content 2', metadata: { source: 'test2.txt' } },
        { content: '', metadata: {} },
        null,
        { content: undefined, metadata: {} },
      ];

      testDocs.forEach((doc) => {
        const result = chatChain.safeExtractContent(doc, 50);
        expect(typeof result).toBe('string');
        expect(result.length).toBeLessThanOrEqual(50);
      });
    });

    it('should safely extract metadata from documents', () => {
      const testDocs = [
        { metadata: { source: 'test.txt', type: 'medical' } },
        { metadata: {} },
        { metadata: null },
        {},
        null,
      ];

      testDocs.forEach((doc) => {
        const result = chatChain.safeExtractMetadata(doc);
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      });
    });

    it('should handle missing pageContent gracefully in source compilation', async () => {
      // Mock retriever to return documents without pageContent
      const mockDocs = [
        { content: 'Medical info about PCOS', metadata: { source: 'pcos.txt' }, score: 0.9 },
        { content: 'Diet recommendations', metadata: { source: 'diet.txt' }, score: 0.8 },
      ];

      // This should not throw an error
      const sources = mockDocs.map((doc) => ({
        content: chatChain.safeExtractContent(doc, 200),
        metadata: chatChain.safeExtractMetadata(doc),
      }));

      expect(sources.length).toBe(2);
      sources.forEach((source) => {
        expect(source).toHaveProperty('content');
        expect(source).toHaveProperty('metadata');
        expect(typeof source.content).toBe('string');
      });
    });
  });

  describe('End-to-End RAG Pipeline', () => {
    it('should process a chat message without errors', async () => {
      const message = 'How are women dealing with PCOS in India?';
      const userContext = {
        age: 28,
        location: 'Mumbai',
        dietaryPreference: 'vegetarian',
      };

      // This should not throw an error
      const response = await chatChain.processMessage(message, userContext);

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('sources');
      expect(response).toHaveProperty('contextUsed');

      // Verify sources structure
      expect(Array.isArray(response.sources)).toBe(true);

      response.sources.forEach((source) => {
        expect(source).toHaveProperty('type');

        if (source.type === 'medical' && source.documents) {
          source.documents.forEach((doc) => {
            expect(doc).toHaveProperty('content');
            expect(doc).toHaveProperty('metadata');
            expect(typeof doc.content).toBe('string');
          });
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should not crash when vector store returns malformed documents', async () => {
      const malformedResults = [
        { content: null, metadata: null, score: 0.5 },
        { pageContent: undefined, metadata: {}, score: 0.3 },
        null,
        undefined,
        {},
      ];

      malformedResults.forEach((doc) => {
        const normalized = retriever.normalizeDocument(doc);
        expect(normalized).toBeDefined();
        expect(normalized).toHaveProperty('content');
        expect(normalized).toHaveProperty('pageContent');
        expect(typeof normalized.content).toBe('string');
      });
    });

    it('should handle empty retrieval results gracefully', async () => {
      // Mock a scenario with no results
      const emptyResults = [];
      const context = retriever.formatContextFromResults(emptyResults);

      expect(typeof context).toBe('string');
      expect(context).toBe('');
    });

    it('should handle invalid input to formatContextFromResults', () => {
      const invalidInputs = [null, undefined, 'string', 123, {}];

      invalidInputs.forEach((input) => {
        const context = retriever.formatContextFromResults(input);
        expect(typeof context).toBe('string');
        expect(context).toBe('');
      });
    });
  });

  describe('Vector Store Operations', () => {
    it('should check initialization status', () => {
      const isReady = vectorStoreManager.isReady();
      expect(typeof isReady).toBe('boolean');
    });

    it('should get stats without errors', async () => {
      const stats = await vectorStoreManager.getStats();

      expect(stats).toHaveProperty('initialized');
      expect(stats).toHaveProperty('hasVectorStore');
      expect(stats).toHaveProperty('dbPath');
      expect(stats).toHaveProperty('dbExists');
    });
  });
});

describe('Data Structure Validation', () => {
  describe('Document Property Consistency', () => {
    it('should maintain consistency between content and pageContent', async () => {
      const query = 'PCOS symptoms management';
      const results = await vectorStoreManager.similaritySearch(query, 5);

      results.forEach((doc, idx) => {
        expect(doc.content).toBe(doc.pageContent);

        if (doc.content !== doc.pageContent) {
          throw new Error(
            `Inconsistency at index ${idx}: content="${doc.content}" vs pageContent="${doc.pageContent}"`
          );
        }
      });
    });

    it('should ensure all documents have required properties', async () => {
      const results = await retriever.retrieve('PCOS diet', { topK: 10 });

      const requiredProps = ['content', 'pageContent', 'metadata', 'score'];

      results.forEach((doc) => {
        requiredProps.forEach((prop) => {
          expect(doc).toHaveProperty(prop);
        });

        expect(typeof doc.content).toBe('string');
        expect(typeof doc.pageContent).toBe('string');
        expect(typeof doc.metadata).toBe('object');
        expect(typeof doc.score).toBe('number');
      });
    });
  });

  describe('Metadata Integrity', () => {
    it('should preserve metadata through the pipeline', async () => {
      const testDoc = {
        content: 'Test PCOS information',
        metadata: {
          source: 'test.txt',
          type: 'medical_knowledge',
          custom: 'value',
        },
      };

      const normalized = retriever.normalizeDocument(testDoc);

      expect(normalized.metadata).toMatchObject(testDoc.metadata);
      expect(normalized.metadata.source).toBe('test.txt');
      expect(normalized.metadata.type).toBe('medical_knowledge');
      expect(normalized.metadata.custom).toBe('value');
    });
  });
});
