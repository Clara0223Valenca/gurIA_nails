import unittest

from validation import InputValidationError, validate_job_input


class ValidateJobInputTest(unittest.TestCase):
    def test_uses_safe_defaults_without_lora(self):
        result = validate_job_input({"prompt": "blue butterfly"}, lora_enabled=False)
        self.assertEqual(768, result["width"])
        self.assertEqual(42, result["seed"])
        self.assertNotIn("naildecalstyle", result["prompt"])

    def test_adds_trigger_exactly_once_with_lora(self):
        result = validate_job_input({"prompt": "blue butterfly"}, lora_enabled=True)
        self.assertEqual(
            "naildecalstyle, blue butterfly",
            result["prompt"],
        )

    def test_rejects_trigger_without_lora(self):
        with self.assertRaises(InputValidationError):
            validate_job_input(
                {"prompt": "naildecalstyle, blue butterfly"},
                lora_enabled=False,
            )

    def test_rejects_arbitrary_model_or_url_fields(self):
        with self.assertRaises(InputValidationError):
            validate_job_input(
                {"prompt": "blue butterfly", "model": "https://example.test/model"},
                lora_enabled=False,
            )

    def test_rejects_invalid_dimensions(self):
        with self.assertRaises(InputValidationError):
            validate_job_input(
                {"prompt": "blue butterfly", "width": 777},
                lora_enabled=False,
            )


if __name__ == "__main__":
    unittest.main()
