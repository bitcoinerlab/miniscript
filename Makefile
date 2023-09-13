HEADERS := miniscript/bitcoin/util/vector.h miniscript/bitcoin/util/strencodings.h miniscript/bitcoin/span.h miniscript/bitcoin/util/spanparsing.h miniscript/bitcoin/script/script.h miniscript/bitcoin/script/miniscript.h miniscript/compiler.h miniscript/bitcoin/crypto/common.h miniscript/bitcoin/serialize.h miniscript/bitcoin/prevector.h miniscript/bitcoin/compat/endian.h miniscript/bitcoin/compat/byteswap.h miniscript/bitcoin/attributes.h miniscript/bitcoin/tinyformat.h miniscript/bitcoin/primitives/transaction.h
SOURCES := miniscript/bitcoin/util/strencodings.cpp miniscript/bitcoin/util/spanparsing.cpp miniscript/bitcoin/script/script.cpp miniscript/bitcoin/script/miniscript.cpp miniscript/compiler.cpp
src/bindings.js: miniscript $(HEADERS) $(SOURCES) miniscript/js_bindings.cpp
	em++ -O3 -g0 -Wall -std=c++17 -fno-rtti -flto -Iminiscript/bitcoin $(SOURCES) miniscript/js_bindings.cpp -s WASM=0 -s EXPORT_ES6=0 --memory-init-file 0 -s MODULARIZE=1 -s MALLOC=emmalloc -s WASM_ASYNC_COMPILATION=0 -s FILESYSTEM=0 -s ENVIRONMENT=web -s DISABLE_EXCEPTION_CATCHING=0 -s EXPORTED_FUNCTIONS='["_miniscript_compile","_miniscript_analyze","_malloc","_free"]' -s EXPORTED_RUNTIME_METHODS='["cwrap","UTF8ToString"]' -o src/bindings.js
miniscript:
	git clone https://github.com/sipa/miniscript
	#484386a50dbda962669cc163f239fe16e101b6f0 is the last commit where this Makefile has been checked to work:
	git -C miniscript reset --hard 484386a50dbda962669cc163f239fe16e101b6f0
	cp js_bindings.cpp miniscript/
	#See: https://github.com/sipa/miniscript/pull/132
	cp compiler.cpp miniscript/
clean:
	rm -rf miniscript src/bindings.js
