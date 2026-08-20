package ro.mee.laborator;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Keeps the web view out from under the system bars.
 *
 * From Android 15 (API 35) on, an app that targets 35 or later is laid out edge to edge and cannot
 * opt out: the activity window spans the whole screen, status bar and navigation bar included. A
 * plain Capacitor web view therefore paints beneath both. On this app that put the HUD - level,
 * streak, hearts, the settings button - under the clock and the battery icon, and hid the bottom
 * tab bar and "Reseteaza progresul" behind the navigation buttons.
 *
 * The web side cannot fix it on its own. index.html already asks for `viewport-fit=cover`, but
 * nothing in the CSS reads `env(safe-area-inset-*)`, and an Android web view does not reliably
 * report the system bars through those variables anyway - only the display cutout, and only in
 * some configurations. Padding the content view is measured rather than inferred: the values come
 * from the window itself.
 *
 * The listener returns the insets it received instead of WindowInsetsCompat.CONSUMED. Consuming
 * them would stop the propagation that the soft keyboard relies on, and this app has numeric-answer
 * exercises where the keyboard must not cover the field. Nothing below re-applies the padding, so
 * passing them on costs nothing.
 */
public class MainActivity extends BridgeActivity {

    /** Same as `background_color` in the web manifest, so the padded strips read as part of the app. */
    private static final int BACKGROUND = Color.parseColor("#0A0E12");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final View content = findViewById(android.R.id.content);
        content.setBackgroundColor(BACKGROUND);

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return windowInsets;
        });
    }
}
