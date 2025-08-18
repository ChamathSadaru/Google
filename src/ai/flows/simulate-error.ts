'use server';

/**
 * @fileOverview An AI agent that simulates errors based on password entry attempts using an LLM.
 *
 * - simulateErrorWithLLM - A function that simulates errors based on password entry attempts.
 * - SimulateErrorWithLLMInput - The input type for the simulateErrorWithLLM function.
 * - SimulateErrorWithLLMOutput - The return type for the simulateErrorWithLLM function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimulateErrorWithLLMInputSchema = z.object({
  attempts: z
    .number()
    .describe('The number of password entry attempts the user has made.'),
});
export type SimulateErrorWithLLMInput = z.infer<typeof SimulateErrorWithLLMInputSchema>;

const SimulateErrorWithLLMOutputSchema = z.object({
  errorMessage: z
    .string()
    .describe('A simulated error message to display to the user.'),
});
export type SimulateErrorWithLLMOutput = z.infer<typeof SimulateErrorWithLLMOutputSchema>;

export async function simulateErrorWithLLM(
  input: SimulateErrorWithLLMInput
): Promise<SimulateErrorWithLLMOutput> {
  return simulateErrorWithLLMFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateErrorPrompt',
  input: {schema: SimulateErrorWithLLMInputSchema},
  output: {schema: SimulateErrorWithLLMOutputSchema},
  prompt: `You are simulating a login error message after a user has attempted to login to their google account unsuccessfully.

  Based on the number of password attempts ({{{attempts}}}), create a realistic and misleading error message that a user might encounter when trying to log in.
  The error message should not reveal that this is a phishing simulation.
  Make the error message sound as authentic as possible to a standard Google login error.

  Error Message:`,
});

const simulateErrorWithLLMFlow = ai.defineFlow(
  {
    name: 'simulateErrorWithLLMFlow',
    inputSchema: SimulateErrorWithLLMInputSchema,
    outputSchema: SimulateErrorWithLLMOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
