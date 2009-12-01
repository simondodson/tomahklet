PlaygrubPlayer = {

    resolve_current_playlist: function() {
        // look for tracks on playdar if authed
        if(Playdar.client && Playdar.client.is_authed() && Playgrub.playlist && Playgrub.playlist.tracks.length > 0) {
            for (var i in Playgrub.playlist.tracks) {
                Playdar.client.resolve(Playgrub.playlist.tracks[i][0], Playgrub.playlist.tracks[i][1]);
            }
        }
    },

    resolved_track: function(artist, track, sid) {
        var track_key = artist+' - '+track;
        $('div.playgrub-playlist-track').each(function(i) {
            if($(this).text() == track_key) {
                $(this).addClass('playgrub-playlist-track-resolved');
                $(this).append("<span class='playgrub-playlist-track-sid'>"+sid+"</span>");
                $(this).click(PlaygrubPlayer.play_track);
                $(this).show();
            }
        });
        //$("div.playgrub-playlist-track:contains('"+response.query.artist+" - "+response.query.track+"')").css('text-decoration','underline');
    },

    play_track: function() {
        $('.playgrub-playlist-track-playing').removeClass('playgrub-playlist-track-playing');
        $(this).addClass('playgrub-playlist-track-playing');
        sid = $(this).children(".playgrub-playlist-track-sid").text();
        // alert(Playdar.client.get_stream_url(sid));
        Playdar.player.play_stream(sid);
    },

    play_next: function() {
        var found_playable = false;

        $('.playgrub-playlist-track-playing').nextAll().each(function(){
            if($(this).hasClass('playgrub-playlist-track-resolved')){
                $(this).click();
                found_playable = true;
                return false;
            }
        });

        if(!found_playable)
            $('.playgrub-playlist-track-playing').removeClass('playgrub-playlist-track-playing');
    },

    play_playlist: function() {
        // if there aren't any songs playing, play first resolved
        if ($('.playgrub-playlist-track-playing').length == 0) {
            if (('.playgrub-playlist-track-resolved').length > 0)
                $('.playgrub-playlist-track-resolved:first').click();
        } else {
            $('.playgrub-playlist-track-playing').click();
        }
    },

    setup_playdar: function() {
        Playdar.USE_STATUS_BAR = false;
        Playdar.MAX_CONCURRENT_RESOLUTIONS = 15;
        Playdar.MAX_POLLS = 6;
        Playdar.auth_details.receiverurl = Playgrub.PGHOST+'static/playdar_auth.html';
        Playdar.setupClient({

            onStat: function (detected) {
                if (detected) {
                    if (!detected.authenticated) {
                        var connect_link = Playdar.client.get_auth_link_html('Connect to Playdar');
                        Playgrub.content.display_playdar_status(connect_link);
                    }
                } else {
                    Playgrub.content.display_playdar_status('Playdar not available');
                }
            },

            // Called when the browser is authorised to query Playdar.
            onAuth: function () {
                Playgrub.content.playdar_active();
                Playgrub.content.display_playdar_status(Playdar.client.get_disconnect_link_html('Disconnect from Playdar'));
                PlaygrubPlayer.resolve_current_playlist();
            },

            // Called in response to each poll with the results so far.
            onResults: function (response, lastPoll) {
                if (lastPoll) {
                    // Take a look at the final response.
                    if(response.results.length > 0) {
                        // alert('results-> '+response.results.length+' artist ->'+response.query.artist+' track-> '+response.query.track);
                        Playdar.player.register_stream(response.results[0],{
                            onfinish: function() {
                                PlaygrubPlayer.play_next();
                            },

                            onload: function() {
                                if (this.readyState == 2) { // failed/error
                                    PlaygrubPlayer.play_next();
                                }
                            }
                        });
                        PlaygrubPlayer.resolved_track(response.query.artist, response.query.track, response.results[0].sid);
                    }
                }
            },

            onResolveIdle: function() {
                Playgrub.content.playdar_idle();
            }

        });

        soundManager.onload = function () {
            Playdar.setupPlayer(soundManager);
            // start Playdar
            Playdar.client.go();
        };
    }
}

// Setup Playgrub
Playgrub.Events = {

    // Playgrub init
    init: function() {
        // new Playgrub.ScraperSource(); // TODO: extends PlaylistSource
        // new Playgrub.Client();
        // new Playgrub.Bookmarklet();
        new Playgrub.Playlist();
        new Playgrub.Content();
        new Playgrub.RemoteSource();  // TODO: extends PlaylistSource

        PlaygrubPlayer.setup_playdar();
    },

    // no scraper found for this domain
    noScraper: function() {
    },

    // scraper found but there were no songs
    noSongs: function() {
    },

    // source done finding songs
    foundSongs: function() {
        Playgrub.content.display_playlist();
        PlaygrubPlayer.resolve_current_playlist();
    },

    // playdar response
    playdarResponse: function(response, lastPoll) {
    },

    // Playgrub.client is done broadcasting playlist
    clientPlaylistPublished: function() {
    },

    // Playgrub.client is broadcasting a playlist track
    clientTrackPublished: function() {
    }
};

// Load Playdar and jQuery and start Playgrub.init() when done
Playgrub.Util.load_remotes( [
    ['Playdar', Playgrub.PGHOST+'js/playdar_compressed.js'],
    ['jQuery', 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js']
    ], function() { Playgrub.Events.init(); });

