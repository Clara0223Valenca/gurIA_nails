package br.edu.iffar.gurianails.ai;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record AiRequest(
        @Size(max = 1200) String prompt,
        @Min(1) @Max(4) Integer quantity,
        @Size(max = 80) String format,
        @Size(max = 80) String finger,
        @DecimalMin("1.0") @DecimalMax("40.0") Double widthMm,
        @DecimalMin("1.0") @DecimalMax("60.0") Double lengthMm,
        @Size(max = 20) String background,
        @Size(max = 18_000_000) String referenceImage
) {}
