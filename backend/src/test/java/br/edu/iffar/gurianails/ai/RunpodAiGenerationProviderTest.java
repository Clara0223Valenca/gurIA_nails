package br.edu.iffar.gurianails.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RunpodAiGenerationProviderTest {
    @Test
    void alwaysAddsTheHiddenPrintableDecalContract() {
        AiRequest request = new AiRequest(
                "gato usando óculos",
                1,
                "Oval",
                "Anelar direito",
                10.0,
                14.0,
                "transparent",
                null);

        String prompt = RunpodAiGenerationProvider.buildPrompt(request);

        assertTrue(prompt.contains("Primary subject or theme"));
        assertTrue(prompt.contains("gato usando óculos"));
        assertTrue(prompt.contains("flat 2D vector-style illustration"));
        assertTrue(prompt.contains("matte solid-color fills"));
        assertTrue(prompt.contains("uniform pure white background"));
        assertTrue(prompt.contains("zero visual depth"));
        assertFalse(prompt.contains("hands"));
        assertFalse(prompt.contains("fingernails"));
        assertFalse(prompt.contains("nail-polish"));
        assertTrue(prompt.length() <= 1200);
    }

    @Test
    void removesTheLoraTriggerUntilTheLoraIsEnabled() {
        AiRequest request = new AiRequest(
                "naildecalstyle flores azuis",
                1,
                null,
                null,
                null,
                null,
                null,
                null);

        String prompt = RunpodAiGenerationProvider.buildPrompt(request);

        assertFalse(prompt.toLowerCase().contains("naildecalstyle"));
        assertTrue(prompt.contains("flores azuis"));
    }
}
