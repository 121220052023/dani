test

---
## Test Coverage Updates

### AuthService: 6 tests (Validation, Arabic support, Error Handling)
- Invalid email format
- Short password validation
- Empty name validation
- Whitespace trimming
- Arabic language support for error messages
- Error message mapping

### CartService: 5 tests (Validation, Exceptions, Stock)
- Exception creation
- Quantity validation
- Stock validation
- Arabic language support

### OrderService: 6 tests (Validation, Arabic, Payment, Mapping)
- Exception handling
- Payment method validation
- Stock insufficient errors
- Empty cart errors
- Arabic error messages
- Error mapping logic

### Test Statistics
| Service | Tests | Coverage |
|---------|-------|----------|
| AuthService | 6 | Validation, Arabic, Error Handling |
| CartService | 5 | Validation, Exceptions, Stock |
| OrderService | 6 | Validation, Arabic, Payment, Mapping |

---

## Test Execution

All tests can be executed with:
```bash
cd mobile_app
flutter test
```

